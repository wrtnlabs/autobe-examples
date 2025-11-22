import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { ContentmoderatorPayload } from "../../decorators/payload/ContentmoderatorPayload";

export async function contentmoderatorAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<ContentmoderatorPayload> {
  const payload: ContentmoderatorPayload = jwtAuthorize({ request }) as ContentmoderatorPayload;

  if (payload.type !== "content_moderator") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Verify the user exists and is active
  const user = await MyGlobal.prisma.econ_political_discussion_users.findFirst({
    where: {
      id: payload.id,
      deleted_at: null, // Ensure user is not deleted
    },
  });

  if (user === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  // Additional verification for moderator status
  if (user.status !== "active") {
    throw new ForbiddenException("Your account is not active for content moderation");
  }

  return payload;
}