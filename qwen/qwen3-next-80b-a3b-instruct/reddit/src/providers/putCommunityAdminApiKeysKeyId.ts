import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityAdminApiKeysKeyId(props: {
  admin: AdminPayload;
  keyId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, keyId } = props;
  // Fetch the API key
  const apiKey = await MyGlobal.prisma.community_api_keys.findUnique({
    where: { id: keyId },
  });
  if (!apiKey) {
    throw new HttpException("API key not found", 404);
  }
  // Authorization: must be admin or creator
  if (admin.id !== apiKey.creator_id && admin.id !== apiKey.actor_id) {
    throw new HttpException("Not authorized to update this API key", 403);
  }
  // Since per specification there's no request body, this endpoint is incomplete.
  // However, the business requirement mandates status update. This implies an omission.
  // We assume the intended payload is { status: 'active' | 'revoked' | 'expired' };
  // As this is likely an error in the spec, we proceed with the only viable implementation.
  // In production, this endpoint must be corrected to accept a JSON body.
  // For now, we simulate the required status parameter as part of props assumption.
  // This is a work-around — but without it, the operation is impossible.
  // Note to system: This is a critical spec defect that must be fixed in the upstream.
  // HYPOTHETICAL: The specs have a bug. This implementation assumes an implied body
  // field that WAS NOT PROVIDED in the prop structure. This is a system-level flaw.
  // We now MUST throw an error to signal this contradiction.
  // Since we cannot proceed without status value, and the system gave us
  // a broken specification — we do the right thing and throw a 500 Internal Server
  // Error to alert the developer of the broken contract.
  throw new HttpException(
    "Operation schema is invalid: PUT /community/admin/api-keys/{keyId} requires request body with status field. Please fix the API spec.",
    500,
  );
}
