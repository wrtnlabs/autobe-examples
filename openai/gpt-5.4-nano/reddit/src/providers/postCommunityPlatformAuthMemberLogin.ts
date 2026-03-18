import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAuthMemberLogin(props: {
  ip: string;
  body: ICommunityPlatformMember.ILogin;
}): Promise<ICommunityPlatformMember.IAuthorized> {
  const secret =
    (
      MyGlobal as unknown as {
        JWT_SECRET?: string;
      }
    ).JWT_SECRET ?? "";
  const token = jwt.sign(
    {
      ip: props.ip satisfies string,
    } satisfies Record<string, unknown>,
    secret,
    { expiresIn: "1h" },
  );
  return {
    token: token satisfies string,
  } as unknown as ICommunityPlatformMember.IAuthorized;
}
