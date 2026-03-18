import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { HrmTimeTrackingOrganizationTransformer } from "../transformers/HrmTimeTrackingOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingOwnerOrganizationsOrganizationId(props: {
  owner: OwnerPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingOrganization> {
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findFirstOrThrow({
      where: {
        id: props.organizationId,
        deleted_at: null,
      },
      ...HrmTimeTrackingOrganizationTransformer.select(),
    });
  return await HrmTimeTrackingOrganizationTransformer.transform(organization);
}
