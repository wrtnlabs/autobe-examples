import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { OwnerPayload } from "../../decorators/payload/OwnerPayload";

export async function ownerAuthorize(request: {
  headers: { authorization?: string };
}): Promise<OwnerPayload> {
  const payload: OwnerPayload = jwtAuthorize({ request }) as OwnerPayload;

  if (payload.type !== "owner") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const owner = await MyGlobal.prisma.reddit_like_owners.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (owner === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}