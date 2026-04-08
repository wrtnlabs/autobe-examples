import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackMemberTransformer } from "../transformers/HrmTimeTrackMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackMembersMemberId(props: {
  memberId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackMember> {
  const record = await MyGlobal.prisma.hrm_time_track_members.findFirstOrThrow({
    ...HrmTimeTrackMemberTransformer.select(),
    where: {
      id: props.memberId,
      deleted_at: null,
    },
  });
  return await HrmTimeTrackMemberTransformer.transform(record);
}
