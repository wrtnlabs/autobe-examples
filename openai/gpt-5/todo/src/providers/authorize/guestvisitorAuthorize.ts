// File path: src/providers/authorize/guestvisitorAuthorize.ts
import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize"; // ← MUST be same directory import
import { GuestvisitorPayload } from "../../decorators/payload/GuestvisitorPayload";

/**
 * Authorize request as a Guestvisitor.
 *
 * - Verifies JWT via shared jwtAuthorize
 * - Ensures payload.type === "guestvisitor"
 * - Confirms the guest visitor exists and is active (deleted_at is null)
 * - Returns the verified JWT payload on success
 */
export async function guestvisitorAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<GuestvisitorPayload> {
  const payload: GuestvisitorPayload = jwtAuthorize({ request }) as GuestvisitorPayload;

  if (payload.type !== "guestvisitor") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Standalone role table: use primary key id matching payload.id
  const guest = await MyGlobal.prisma.todo_list_guest_visitors.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (guest === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
