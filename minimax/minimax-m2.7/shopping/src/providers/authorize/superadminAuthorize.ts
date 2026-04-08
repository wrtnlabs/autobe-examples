import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { SuperadminPayload } from "../../decorators/payload/SuperadminPayload";

export async function superadminAuthorize(request: {
  headers: { authorization?: string };
}): Promise<SuperadminPayload> {
  const payload: SuperadminPayload = jwtAuthorize({
    request,
  }) as SuperadminPayload;

  if (payload.type !== "super_admin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const superadmin = await MyGlobal.prisma.ecommerce_mall_super_admins.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (superadmin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}