import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdministratorPayload } from "../../decorators/payload/AdministratorPayload";

export async function administratorAuthorize(request: {
  headers: { authorization?: string };
}): Promise<AdministratorPayload> {
  let payload: AdministratorPayload;

  try {
    payload = jwtAuthorize({ request }) as AdministratorPayload;
  } catch {
    throw new UnauthorizedException("Invalid authorization token.");
  }

  if (payload.type !== "administrator") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const administrator = await MyGlobal.prisma.mall_platform_administrators.findFirst({
    where: {
      id: payload.id,
    },
  });

  if (administrator === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}