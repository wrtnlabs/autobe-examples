import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformContractCollector } from "../collectors/HrmPlatformContractCollector";
import { HrmPlatformContractTransformer } from "../transformers/HrmPlatformContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformContracts(props: {
  body: IHrmPlatformContract.ICreate;
}): Promise<IHrmPlatformContract> {
  // Check for existing active contract for this employee
  const activeContract = await MyGlobal.prisma.hrm_platform_contracts.findFirst(
    {
      where: {
        hrm_platform_employee_id: props.body.employee_id,
        deleted_at: null,
        OR: [{ end_at: null }, { end_at: { gt: new Date() } }],
      },
    },
  );
  // If active contract exists, end it the day before the new contract starts
  if (activeContract) {
    const newStartDate = new Date(props.body.start_at);
    const endDate = new Date(newStartDate.getTime() - 24 * 60 * 60 * 1000);
    await MyGlobal.prisma.hrm_platform_contracts.update({
      where: { id: activeContract.id },
      data: {
        end_at: endDate,
        updated_at: new Date(),
      },
    });
  }
  // Create the new contract
  const created = await MyGlobal.prisma.hrm_platform_contracts.create({
    data: await HrmPlatformContractCollector.collect({ body: props.body }),
    ...HrmPlatformContractTransformer.select(),
  });
  return await HrmPlatformContractTransformer.transform(created);
}
