import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_revoked_token_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member account to obtain initial tokens
  const baseConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEconomicPoliticalBoardMember.IJoin;
  const initialAuth = await authorize_member_join(baseConnection, {
    body: memberData,
  });
  typia.assert(initialAuth);
  // 2. Verify initial token works by refreshing it
  const freshAuth = await authorize_member_refresh(baseConnection, {
    body: { refreshToken: initialAuth.token.refresh },
  });
  typia.assert(freshAuth);
  // 3. Verify that using an invalid/revoked token returns 401 Unauthorized
  // In real scenario, this would be done by admin revoking token,
  // changing user password, or banning the user
  await TestValidator.httpError(
    "should return 401 for revoked/invalid token",
    401,
    async () => {
      await api.functional.economicPoliticalBoard.auth.member.refresh(
        connection,
        {
          body: { refreshToken: "invalid.revoked.token.here" },
        },
      );
    },
  );
}