import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumRegisteredUser";

export async function test_api_registered_user_search_admin_filter_by_email_verified(
  connection: api.IConnection,
) {
  /**
   * Validate administrator can filter registered users by emailVerified flag.
   *
   * Steps:
   *
   * 1. Register administrator (admin auth will be set on `connection`).
   * 2. Using an unauthenticated connection clone, create three registered users.
   * 3. Verify email for one candidate user by calling the verify-email endpoint
   *    (test harness / simulator token usage). In a real harness, capture the
   *    verification token from the email queue or DB and pass it here.
   * 4. As administrator, call the admin users.index with filter { emailVerified:
   *    true }
   * 5. Assert the paginated response includes the verified user's id and excludes
   *    the other two.
   */

  // 1) Administrator signup (will set admin auth into `connection`).
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassw0rd!",
        username: RandomGenerator.alphaNumeric(8),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // Prepare an unauthenticated connection clone for public user creation flows.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Create three registered users: unverified, verified_candidate, other
  const user_unverified: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(unauthConn, {
      body: {
        username: `u_${RandomGenerator.alphaNumeric(6)}`,
        email: typia.random<string & tags.Format<"email">>(),
        password: "UserPassw0rd!",
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(user_unverified);

  const user_verified_candidate: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(unauthConn, {
      body: {
        username: `v_${RandomGenerator.alphaNumeric(6)}`,
        email: typia.random<string & tags.Format<"email">>(),
        password: "UserPassw0rd!",
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(user_verified_candidate);

  const user_other: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(unauthConn, {
      body: {
        username: `o_${RandomGenerator.alphaNumeric(6)}`,
        email: typia.random<string & tags.Format<"email">>(),
        password: "UserPassw0rd!",
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(user_other);

  // 3) Verify email for the candidate user.
  // IMPORTANT: In a real test harness you MUST obtain the actual verification
  // token created by the join flow (from email queue or DB) and supply it here.
  // The SDK does not provide token retrieval; the simulator accepts a
  // non-empty token. We simulate token consumption for harness-simulated runs.
  const verifyRes: IEconPoliticalForumRegisteredUser.IGenericSuccess =
    await api.functional.auth.registeredUser.verify_email.verifyEmail(
      unauthConn,
      {
        body: {
          token: typia.random<string & tags.MinLength<1>>(),
        } satisfies IEconPoliticalForumRegisteredUser.IVerifyEmail,
      },
    );
  typia.assert(verifyRes);

  // 4) As admin, perform filtered search for emailVerified = true
  const requestBody = {
    emailVerified: true,
    page: 1,
    limit: 20,
  } satisfies IEconPoliticalForumRegisteredUser.IRequest;

  const page: IPageIEconPoliticalForumRegisteredUser.ISummary =
    await api.functional.econPoliticalForum.administrator.users.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(page);

  // 5) Assertions
  // Because IEconPoliticalForumRegisteredUser.ISummary does not expose the
  // email_verified flag, assert the filtering semantics by checking returned
  // IDs: the verified candidate must be present and the other created users
  // must not be present.
  const foundVerified = page.data.some(
    (s) => s.id === user_verified_candidate.id,
  );
  const foundUnverified = page.data.some((s) => s.id === user_unverified.id);
  const foundOther = page.data.some((s) => s.id === user_other.id);

  TestValidator.predicate(
    "filtered results contain the verified user and exclude unverified ones",
    foundVerified === true && foundUnverified === false && foundOther === false,
  );

  // Pagination metadata matches request
  TestValidator.equals(
    "pagination current equals request page",
    page.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit equals request limit",
    page.pagination.limit,
    20,
  );

  // NOTE: Teardown / cleanup
  // The test harness / CI should reset the test database or remove created
  // records. No cleanup endpoint is provided in the SDK materials; implement
  // teardown externally (DB reset or transactional rollback) as part of the
  // test runner.
}
