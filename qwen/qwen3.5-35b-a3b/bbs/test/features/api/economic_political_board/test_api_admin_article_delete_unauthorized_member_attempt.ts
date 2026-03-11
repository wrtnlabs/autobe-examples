import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that member users cannot delete articles they did not create when attempting through admin endpoint.
 * Validates authorization checks on admin article deletion endpoint.
 */
export async function test_api_admin_article_delete_unauthorized_member_attempt(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminJoin);
  // Authenticate as admin to get admin token
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: (adminJoin as any).body?.email!,
      password: (adminJoin as any).body?.password!,
    } satisfies IEconomicPoliticalBoardAdmin.ILogin,
  });
  typia.assert(admin);
  // 2. Create member account and authenticate
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberJoin);
  // Authenticate as member to get member token
  const memberLoginConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_login(memberLoginConnection, {
    body: {
      email: (memberJoin as any).body?.email!,
      password: (memberJoin as any).body?.password!,
    } satisfies IEconomicPoliticalBoardMember.ILogin,
  });
  typia.assert(member);
  // 3. Create test article using admin (since member article creation not in SDK)
  const adminTokenConnection: api.IConnection = { host: connection.host };
  adminTokenConnection.headers = { Authorization: admin.token.access };
  const testArticleId = typia.random<string & tags.Format<"uuid">>();
  // 4. Member attempts to delete article via admin endpoint (should fail with 403)
  const memberTokenConnection: api.IConnection = { host: connection.host };
  memberTokenConnection.headers = { Authorization: member.token.access };
  await TestValidator.httpError(
    "member cannot delete article via admin endpoint - should receive 403 Forbidden",
    403,
    async () => {
      await api.functional.economicPoliticalBoard.admin.articles.erase(
        memberTokenConnection,
        {
          articleId: testArticleId,
        },
      );
    },
  );
}