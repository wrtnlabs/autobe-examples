import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

export async function test_api_member_user_login_after_join_flow_end_to_end(
  connection: api.IConnection,
) {
  // 1. Prepare unique credentials and URLs for the flow
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(16);

  const joinHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const joinReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const loginHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const loginReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const displayName: string = RandomGenerator.paragraph({ sentences: 2 });

  // 2. Perform join (registration) call
  const joinBody = {
    email,
    password,
    displayName,
    bio: null,
    location: null,
    ip: null,
    href: joinHref,
    referrer: joinReferrer,
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const joined: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // Basic identity invariants from join
  TestValidator.predicate(
    "joined account_status should allow login (non-empty string)",
    joined.account_status.length > 0,
  );
  TestValidator.predicate(
    "joined account must not be closed by admin",
    joined.closed_by_admin === false,
  );
  TestValidator.predicate(
    "joined deleted_at should be null or undefined for active account",
    joined.deleted_at === null || joined.deleted_at === undefined,
  );

  // Capture join lifecycle/tokens for comparison
  const joinCreatedAt = joined.created_at;
  const joinUpdatedAt = joined.updated_at;
  const joinLastLoginAt = joined.last_login_at ?? null;
  const joinToken: IAuthorizationToken = joined.token;

  // 3. Simulate client-side logout: do not reuse token values explicitly
  // (No manipulation of connection.headers; SDK manages headers itself.)

  // 4. Perform login with the same credentials
  const loginBody = {
    email,
    password,
    ip: null,
    href: loginHref,
    referrer: loginReferrer,
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const loggedIn: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // 5. Validate core identity stability across join and login
  TestValidator.equals(
    "email must be identical between join and login",
    loggedIn.email,
    joined.email,
  );
  TestValidator.equals(
    "id must be identical between join and login",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "display_name should remain the same across join and login",
    loggedIn.display_name,
    joined.display_name,
  );
  TestValidator.equals(
    "account_status should remain unchanged across join and login",
    loggedIn.account_status,
    joined.account_status,
  );
  TestValidator.equals(
    "closed_by_admin must remain false after login",
    loggedIn.closed_by_admin,
    false,
  );

  // 6. Validate lifecycle timestamps
  TestValidator.equals(
    "created_at should be stable across join and login",
    loggedIn.created_at,
    joinCreatedAt,
  );

  // updated_at should be >= initial updated_at (lexicographic compare is safe on ISO strings)
  TestValidator.predicate(
    "updated_at after login should be greater than or equal to join updated_at",
    loggedIn.updated_at >= joinUpdatedAt,
  );

  // last_login_at should be non-null after login and >= previous last_login_at when it existed
  TestValidator.predicate(
    "last_login_at after login must not be null or undefined",
    loggedIn.last_login_at !== null && loggedIn.last_login_at !== undefined,
  );
  if (joinLastLoginAt !== null) {
    const loginLastLoginAt = typia.assert<string & tags.Format<"date-time">>(
      loggedIn.last_login_at!,
    );
    TestValidator.predicate(
      "last_login_at after login should be >= join last_login_at when previous value existed",
      loginLastLoginAt >= joinLastLoginAt,
    );
  }

  // 7. Validate token pair renewal semantics
  const loginToken: IAuthorizationToken = loggedIn.token;
  typia.assert(loginToken);

  const tokenChanged =
    loginToken.access !== joinToken.access ||
    loginToken.refresh !== joinToken.refresh ||
    loginToken.expired_at !== joinToken.expired_at ||
    loginToken.refreshable_until !== joinToken.refreshable_until;

  TestValidator.predicate(
    "at least one of the token fields (access/refresh/expired_at/refreshable_until) must change between join and login",
    tokenChanged,
  );
}
