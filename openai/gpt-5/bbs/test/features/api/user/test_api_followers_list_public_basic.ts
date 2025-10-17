import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussUser";

/**
 * Public followers listing returns a paginated list including newly created
 * followers.
 *
 * Workflow:
 *
 * 1. Create target user (T).
 * 2. Create follower users (F1, F2).
 * 3. As F1 and F2, follow T using the authenticated follow endpoint.
 * 4. Without authentication, list followers of T and validate that F1 and F2
 *    appear.
 * 5. Ensure ordering is stable across repeated reads.
 */
export async function test_api_followers_list_public_basic(
  connection: api.IConnection,
) {
  // Helper to create a member with random but valid attributes
  const makeMemberBody = () =>
    ({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    }) satisfies IEconDiscussMember.ICreate;

  // 1) Target user T joins (connection Authorization becomes T)
  const targetAuth: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: makeMemberBody(),
    });
  typia.assert<IEconDiscussMember.IAuthorized>(targetAuth);
  const targetId = targetAuth.id;

  // 2) Follower F1 joins (Authorization becomes F1) and follows T
  const f1Auth: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: makeMemberBody(),
    });
  typia.assert<IEconDiscussMember.IAuthorized>(f1Auth);
  const f1Id = f1Auth.id;

  await api.functional.econDiscuss.member.users.follow.create(connection, {
    userId: targetId,
  });

  // 3) Follower F2 joins (Authorization becomes F2) and follows T
  const f2Auth: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: makeMemberBody(),
    });
  typia.assert<IEconDiscussMember.IAuthorized>(f2Auth);
  const f2Id = f2Auth.id;

  await api.functional.econDiscuss.member.users.follow.create(connection, {
    userId: targetId,
  });

  // 4) Build unauthenticated connection for public access
  const publicConn: api.IConnection = { ...connection, headers: {} };

  // 5) Call followers index (first read)
  const page1: IPageIEconDiscussUser.ISummary =
    await api.functional.econDiscuss.users.followers.index(publicConn, {
      userId: targetId,
    });
  typia.assert<IPageIEconDiscussUser.ISummary>(page1);

  // Basic validations
  const ids1 = page1.data.map((u) => u.id);
  TestValidator.predicate(
    "followers list should include F1",
    ids1.includes(f1Id),
  );
  TestValidator.predicate(
    "followers list should include F2",
    ids1.includes(f2Id),
  );
  TestValidator.predicate(
    "followers list should contain at least 2 entries",
    page1.data.length >= 2,
  );

  // Ensure no duplicates for F1/F2
  const count = (id: string) => ids1.filter((x) => x === id).length;
  TestValidator.equals("F1 appears exactly once", count(f1Id), 1);
  TestValidator.equals("F2 appears exactly once", count(f2Id), 1);

  // 6) Verify ordering stability by fetching twice and comparing sequences
  const page2: IPageIEconDiscussUser.ISummary =
    await api.functional.econDiscuss.users.followers.index(publicConn, {
      userId: targetId,
    });
  typia.assert<IPageIEconDiscussUser.ISummary>(page2);
  const ids2 = page2.data.map((u) => u.id);
  TestValidator.equals(
    "followers ordering should be stable across reads",
    ids1,
    ids2,
  );
}
