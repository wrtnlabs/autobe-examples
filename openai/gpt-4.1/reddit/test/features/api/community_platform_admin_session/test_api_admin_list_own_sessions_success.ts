import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdminSession";

/**
 * Validate listing of admin's own session records and access control.
 *
 * 1. Register a new admin, obtaining authenticated session and adminId.
 * 2. Request a paginated list of sessions for that admin via platform endpoint.
 *    Validate response contains only sessions belonging to authenticated admin,
 *    with correct status, timestamps, and context properties per schema.
 * 3. Attempt to call the same endpoint with a different (random) adminId to
 *    confirm that session data for other admins cannot be accessed—expect an
 *    error.
 * 4. Confirm response data enables audit and compliance requirements (cross-check
 *    for record attributes: ids, IP, href, referrer, created/expired
 *    timestamps).
 */
export async function test_api_admin_list_own_sessions_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin (join)
  const adminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://www.example.com/register",
    referrer: "https://www.example.com/login",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.ICreate;
  const authorized: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreate });
  typia.assert(authorized);

  // 2. List sessions for this admin
  const reqBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ICommunityPlatformAdminSession.IRequest;
  const sessionsPage: IPageICommunityPlatformAdminSession =
    await api.functional.communityPlatform.admin.admins.sessions.index(
      connection,
      {
        adminId: authorized.id,
        body: reqBody,
      },
    );
  typia.assert(sessionsPage);
  // All sessions returned must belong to this admin
  for (const sess of sessionsPage.data) {
    typia.assert(sess);
    TestValidator.equals(
      "session belongs to correct admin",
      sess.community_platform_admin_id,
      authorized.id,
    );
    TestValidator.predicate(
      "session id is valid uuid",
      typeof sess.id === "string" && sess.id.length > 0,
    );
    TestValidator.predicate(
      "ip is set",
      typeof sess.ip === "string" && sess.ip.length > 0,
    );
    TestValidator.predicate(
      "href present",
      typeof sess.href === "string" && sess.href.length > 0,
    );
    TestValidator.predicate(
      "referrer present",
      typeof sess.referrer === "string" && sess.referrer.length > 0,
    );
    TestValidator.predicate(
      "created_at present",
      typeof sess.created_at === "string" && sess.created_at.length > 0,
    );
    // expired_at can be null/undefined if active
  }

  // 3. Attempt to access sessions of a random different admin (should be forbidden)
  const otherAdminId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "forbidden to list sessions for other admin",
    async () => {
      await api.functional.communityPlatform.admin.admins.sessions.index(
        connection,
        {
          adminId: otherAdminId,
          body: reqBody,
        },
      );
    },
  );
}
