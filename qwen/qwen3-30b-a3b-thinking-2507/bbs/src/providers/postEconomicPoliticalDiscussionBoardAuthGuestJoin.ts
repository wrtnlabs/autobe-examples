import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe"

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicPoliticalDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";


export async function postEconomicPoliticalDiscussionBoardAuthGuestJoin(props: {
    body: IEconomicPoliticalDiscussionBoardGuest.IJoin;
}): Promise<IEconomicPoliticalDiscussionBoardGuest.IAuthorized> {
    // 1. Check guest uniqueness by device_id (not email)
    const existing = await MyGlobal.prisma.economic_political_discussion_board_guests.findFirst({
        where: { device_id: props.body.email },
    });
    if (existing) {
        throw new HttpException("Guest already registered", 409);
    }
    // 2. Create guest account
    const guest = await MyGlobal.prisma.economic_political_discussion_board_guests.create({
        data: {
            id: v4(),
            device_id: props.body.email,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
        },
    });
    // 3. Create session
    const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const session = await MyGlobal.prisma.economic_political_discussion_board_guest_sessions.create({
        data: {
            id: v4(),
            ip: "0.0.0.0",
            economic_political_discussion_board_guest_id: guest.id,
            access_expires_at: accessExpires,
            refresh_expires_at: refreshExpires,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
        },
    });
    // 4. Generate JWT tokens
    const token = {
        access: jwt.sign({
            type: "guest",
            id: guest.id,
            session_id: session.id,
            created_at: toISOStringSafe(accessExpires),
        }, MyGlobal.env.JWT_SECRET_KEY, { expiresIn: "15m", issuer: "autobe" }),
        refresh: jwt.sign({
            type: "guest",
            id: guest.id,
            session_id: session.id,
            tokenType: "refresh",
            created_at: toISOStringSafe(refreshExpires),
        }, MyGlobal.env.JWT_SECRET_KEY, { expiresIn: "7d", issuer: "autobe" }),
        expired_at: toISOStringSafe(accessExpires),
        refreshable_until: toISOStringSafe(refreshExpires),
    };
    // 5. Return authorized response
    return {
        id: guest.id,
        token,
        satisfies, IEconomicPoliticalDiscussionBoardGuest, : .IAuthorized
    };
}
