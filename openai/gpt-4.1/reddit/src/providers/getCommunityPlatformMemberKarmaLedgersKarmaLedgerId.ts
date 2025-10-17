import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformKarmaLedger } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaLedger";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getCommunityPlatformMemberKarmaLedgersKarmaLedgerId(props: {
  member: MemberPayload;
  karmaLedgerId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformKarmaLedger> {
  const { member, karmaLedgerId } = props;

  // Find the karma ledger by id, not soft-deleted
  const ledger =
    await MyGlobal.prisma.community_platform_karma_ledgers.findFirst({
      where: {
        id: karmaLedgerId,
        deleted_at: null,
      },
    });

  if (!ledger) {
    throw new HttpException("Karma ledger not found", 404);
  }

  // Only the owner can retrieve their ledger
  if (ledger.community_platform_member_id !== member.id) {
    throw new HttpException("Forbidden: Not your karma ledger", 403);
  }

  return {
    id: ledger.id,
    community_platform_member_id: ledger.community_platform_member_id,
    community_platform_community_id:
      ledger.community_platform_community_id ?? undefined,
    current_karma: ledger.current_karma,
    feature_lock_reason: ledger.feature_lock_reason ?? undefined,
    updated_at: toISOStringSafe(ledger.updated_at),
    created_at: toISOStringSafe(ledger.created_at),
    deleted_at: ledger.deleted_at
      ? toISOStringSafe(ledger.deleted_at)
      : undefined,
  };
}
