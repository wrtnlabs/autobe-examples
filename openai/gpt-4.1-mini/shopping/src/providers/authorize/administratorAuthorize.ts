import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdministratorPayload } from "../../decorators/payload/AdministratorPayload";

export async function administratorAuthorize(request: { headers: { authorization?: string } }): Promise<AdministratorPayload> {
  const payload: AdministratorPayload = jwtAuthorize({ request }) as AdministratorPayload;

  if (payload.type !== "administrator") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const administrator = await MyGlobal.prisma.shopping_mall_administrators.findFirst({
    where: {
      id: payload.id,
      deleted_at: null
    }
  });

  if (administrator === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
