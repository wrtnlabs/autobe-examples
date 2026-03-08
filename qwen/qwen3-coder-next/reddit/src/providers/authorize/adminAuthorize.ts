import { ForbiddenException, Injectable } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminPayload } from "../../decorators/payload/AdminPayload";

@Injectable()
export class adminAuthorize {
  async execute(request: {
    headers: { authorization?: string };
  }): Promise<AdminPayload> {
    const payload: AdminPayload = jwtAuthorize({ request }) as AdminPayload;

    if (payload.type !== "admin") {
      throw new ForbiddenException(`You're not ${payload.type}`);
    }

    const admin = await MyGlobal.prisma.reddit_like_admins.findFirst({
      where: {
        id: payload.id,
      },
    });

    if (admin === null) {
      throw new ForbiddenException("You're not enrolled");
    }

    return payload;
  }
}
