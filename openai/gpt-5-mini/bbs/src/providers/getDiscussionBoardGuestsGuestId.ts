import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

export async function getDiscussionBoardGuestsGuestId(props: {
  guestId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardGuest> {
  const { guestId } = props;

  /**
   * Validate UUID format for the path parameter. Operation contract: return 400
   * on malformed UUID.
   */
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(guestId)) {
    throw new HttpException("Invalid guestId format", 400);
  }

  // Fetch only the fields required by the API contract
  const guest = await MyGlobal.prisma.discussion_board_guest.findUnique({
    where: { id: guestId },
    select: {
      id: true,
      display_name: true,
      ip: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!guest) {
    throw new HttpException("Not Found", 404);
  }

  // Map database fields to API DTO, converting Date -> ISO strings
  return {
    id: guest.id as string & tags.Format<"uuid">,
    // displayName is optional+nullable in DTO; preserve DB null explicitly
    displayName: guest.display_name ?? null,
    // ip is sensitive; DTO allows null - preserve DB value (can be null)
    ip: guest.ip ?? null,
    createdAt: toISOStringSafe(guest.created_at),
    updatedAt: toISOStringSafe(guest.updated_at),
    deletedAt: guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null,
  };
}
