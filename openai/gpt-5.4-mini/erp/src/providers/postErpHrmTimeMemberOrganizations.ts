import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeOrganizationCollector } from "../collectors/ErpHrmTimeOrganizationCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeOrganizationTransformer } from "../transformers/ErpHrmTimeOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberOrganizations(props: {
  member: MemberPayload;
  body: IErpHrmTimeOrganization.ICreate;
}): Promise<IErpHrmTimeOrganization> {
  try {
    const created = await MyGlobal.prisma.erp_hrm_time_organizations.create({
      data: await ErpHrmTimeOrganizationCollector.collect({
        body: props.body,
        member: props.member,
      }),
      ...ErpHrmTimeOrganizationTransformer.select(),
    });
    return await ErpHrmTimeOrganizationTransformer.transform(created);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new HttpException("Organization name already exists", 409);
      }
      if (error.code === "P2003") {
        throw new HttpException("Invalid organization owner context", 403);
      }
    }
    throw error;
  }
}
