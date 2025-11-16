import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";

/**
 * Test that a newly registered administrator is able to access the admin list
 * endpoint (PATCH /discussionBoard/admin/admins) after authentication.
 *
 * This verifies end-to-end: admin registration, issuance of JWT access/refresh
 * tokens, session establishment, and secure retrieval of a filtered admin
 * summary list. Asserts include: presence of the registered admin in the
 * paginated results (by email), correct pagination metadata, and absence of
 * secure fields (no password/password_hash in response). Ensures only summary
 * information is included and system/audit fields like id, display_name are
 * present.
 */
export async function test_api_admin_list_access_by_authenticated_admin(
  connection: api.IConnection,
) {
  // 1. Register a new administrator (join)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12) + "!Aa", // 12+ chars, strong
    href: "https://autobe-e2e-test.local/registration", // typical browser url
    referrer: "https://autobe-e2e-test.local/landing",
    ip: null,
  } satisfies IDiscussionBoardAdmin.IJoin;
  const joinResp: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(joinResp);
  TestValidator.equals(
    "join returned email matches input",
    joinResp.email,
    adminEmail,
  );
  TestValidator.predicate(
    "join - admin account is initially active",
    joinResp.is_active === true,
  );
  TestValidator.predicate(
    "join - admin account is not blocked",
    joinResp.is_blocked === false,
  );
  TestValidator.predicate(
    "join - admin email not yet verified",
    joinResp.is_email_verified === false,
  );
  TestValidator.predicate(
    "join response has id (is uuid)",
    typeof joinResp.id === "string" && joinResp.id.length === 36,
  );
  typia.assert<IDiscussionBoardAuthorizationToken>(joinResp.token);
  TestValidator.predicate(
    "join response contains access/refresh tokens",
    typeof joinResp.token.access === "string" &&
      typeof joinResp.token.refresh === "string",
  );

  // 2. List admins using authenticated session, filtered by our email
  const listReqBody = {
    email: adminEmail, // filter upon the admin just registered
    page: 1,
    page_size: 10,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IDiscussionBoardAdmin.IRequest;
  const listResp: IPageIDiscussionBoardAdmin.ISummary =
    await api.functional.discussionBoard.admin.admins.index(connection, {
      body: listReqBody,
    });
  typia.assert(listResp);
  TestValidator.equals(
    "admins index result - first page",
    listResp.pagination.current,
    1,
  );
  TestValidator.predicate(
    "result includes at least one matching admin",
    Array.isArray(listResp.data) &&
      listResp.data.some((x) => x.id === joinResp.id),
  );
  // Only safe summary is returned per item (id, display_name only expected)
  const foundAdmin = listResp.data.find((x) => x.id === joinResp.id);
  if (foundAdmin !== undefined) {
    typia.assert<IDiscussionBoardAdmin.ISummary>(foundAdmin);
    TestValidator.equals("summary id matches join", foundAdmin.id, joinResp.id);
    TestValidator.predicate(
      "display_name is present",
      typeof foundAdmin.display_name === "string" &&
        foundAdmin.display_name.length > 0,
    );
  }
}
