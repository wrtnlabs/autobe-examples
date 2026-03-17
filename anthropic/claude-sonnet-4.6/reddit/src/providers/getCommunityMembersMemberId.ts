import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityMemberTransformer } from "../transformers/CommunityMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityMembersMemberId(props: {
  memberId: string & tags.Format<"uuid">;
}): Promise<ICommunityMember> {
  const record = await MyGlobal.prisma.community_members.findFirstOrThrow({
    where: {
      id: props.memberId,
      deleted_at: null,
    },
    ...CommunityMemberTransformer.select(),
  });
  return CommunityMemberTransformer.transform(record);
}
