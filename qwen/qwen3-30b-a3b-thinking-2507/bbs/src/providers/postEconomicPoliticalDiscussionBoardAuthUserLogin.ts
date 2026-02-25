import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicPoliticalDiscussionBoardUserAtSummaryTransformer } from "../transformers/EconomicPoliticalDiscussionBoardUserAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicPoliticalDiscussionBoardAuthUserLogin(props: {
  body: IEconomicPoliticalDiscussionBoardUser.ILogin;
}): Promise<IEconomicPoliticalDiscussionBoardUser.IAuthorized> {
  // 1. Find actor with password_hash
  const user =
    await MyGlobal.prisma.economic_political_discussion_board_users.findFirst({
      where: { email: props.body.email },
      select: {
        ...EconomicPoliticalDiscussionBoardUserAtSummaryTransformer.select()
          .select,
        password_hash: true,
      },
    });
  if (!user) throw new HttpException("Invalid email or password", 401);
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid email or password", 401);
  // 3. Create NEW session
  const accessExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.economic_political_discussion_board_user_sessions.create(
      {
        data: {
          id: v4(),
          user: {
            connect: { id: user.id },
          },
          created_at: toISOStringSafe(new Date()),
          expired_at: toISOStringSafe(accessExpires),
        },
      },
    );
  // 4. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "24h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 5. Return IAuthorized
  return {
    ...(await EconomicPoliticalDiscussionBoardUserAtSummaryTransformer.transform(
      user,
    )),
    token,
  } satisfies IEconomicPoliticalDiscussionBoardUser.IAuthorized;
}
