import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import jwt from "jsonwebtoken";

import { MyGlobal } from "../../MyGlobal";
import { AdminPayload } from "../../decorators/payload/AdminPayload";

export async function adminAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<AdminPayload> {
  if (!request.headers.authorization) {
    throw new ForbiddenException("No token value exists");
  } else if (!request.headers.authorization.startsWith("Bearer ")) {
    throw new UnauthorizedException("Invalid token");
  }

  try {
    const token: string = request.headers.authorization.substring("Bearer ".length);
    const payload: AdminPayload = jwt.verify(token, MyGlobal.env.JWT_SECRET_KEY) as AdminPayload;

    if (payload.type !== "admin") {
      throw new ForbiddenException(`You're not ${payload.type}`);
    }

    // Verify admin exists and is active
    const admin = await MyGlobal.prisma.todo_app_administrators.findFirst({
      where: {
        id: payload.id,
        status: "active",
        deleted_at: null
      }
    });

    if (admin === null) {
      throw new ForbiddenException("Admin account not found or deactivated");
    }

    // Verify session exists and belongs to the admin
    const session = await MyGlobal.prisma.todo_app_administrator_sessions.findFirst({
      where: {
        id: payload.session_id,
        administrator_id: payload.id,
        // Check if session is not expired
        OR: [
          { expired_at: null },
          { expired_at: { gt: new Date() } }
        ]
      }
    });

    if (session === null) {
      throw new UnauthorizedException("Invalid or expired admin session");
    }

    return payload;
  } catch {
    throw new UnauthorizedException("Invalid token");
  }
}