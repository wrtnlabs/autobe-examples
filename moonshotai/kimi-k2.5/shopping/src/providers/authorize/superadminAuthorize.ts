import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { SuperadminPayload } from "../../decorators/payload/SuperadminPayload";

export async function superadminAuthorize(request: {
  headers: { authorization?: string };
}): Promise<SuperadminPayload> {
  const payload: SuperadminPayload = jwtAuthorize({ request }) as SuperadminPayload;

  if (payload.type !== "superAdmin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const superAdmin = await MyGlobal.prisma.ecommerce_mall_super_admins.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (superAdmin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}