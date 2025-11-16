import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteEconomicDiscussionMemberSearchHistory(props: {
  member: MemberPayload;
}): Promise<void> {
  // Delete all search history entries for the authenticated member
  await MyGlobal.prisma.economic_discussion_search_history.deleteMany({
    where: {
      economic_discussion_member_id: props.member.id,
    },
  });
}
