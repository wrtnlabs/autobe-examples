import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackRoleTransformer } from "../transformers/HrmTimeTrackRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackMemberRolesRoleId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackRole> {
  const record = await MyGlobal.prisma.hrm_time_track_roles.findFirstOrThrow({
    ...HrmTimeTrackRoleTransformer.select(),
    where: {
      id: props.roleId,
      deleted_at: null,
    },
  });
  return await HrmTimeTrackRoleTransformer.transform(record);
}
