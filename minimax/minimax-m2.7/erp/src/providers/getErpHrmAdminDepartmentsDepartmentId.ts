import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmDepartmentTransformer } from "../transformers/ErpHrmDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmAdminDepartmentsDepartmentId(props: {
  admin: AdminPayload;
  departmentId: string & tags.Format<"uuid">;
}): Promise<IErpHrmDepartment> {
  const department = await MyGlobal.prisma.erp_hrm_departments.findFirstOrThrow(
    {
      where: {
        id: props.departmentId,
        deleted_at: null,
      },
      ...ErpHrmDepartmentTransformer.select(),
    },
  );
  return await ErpHrmDepartmentTransformer.transform(department);
}
