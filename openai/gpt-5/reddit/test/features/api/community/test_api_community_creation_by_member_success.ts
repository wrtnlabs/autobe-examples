import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { IECommunityVisibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityVisibility";

export async function test_api_community_creation_by_member_success(
  connection: api.IConnection,
) {
  /**
   * Happy-path: an authenticated member creates a community with valid inputs.
   *
   * Steps
   *
   * 1. Register (join) as a member user to obtain authenticated context
   * 2. Create a community with unique name, visibility="public", nsfw=false,
   *    auto_archive_days=30 (minimum allowed)
   * 3. Validate that response matches schema and echoes input fields
   */
  // 1) Register a fresh member user (SDK sets Authorization automatically)
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = `u_${RandomGenerator.alphaNumeric(10)}`; // [A-Za-z0-9_]{3,20}
  const password: string = `A1${RandomGenerator.alphaNumeric(10)}`; // >=8, contains letter+digit
  const nowIso: string = new Date().toISOString();

  const joinBody = {
    email,
    username,
    password,
    terms_accepted_at: nowIso,
    privacy_accepted_at: nowIso,
  } satisfies ICommunityPlatformMemberUser.ICreate;

  const member: ICommunityPlatformMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2) Create a community with valid inputs
  const handle: string = `c_${RandomGenerator.alphaNumeric(12)}`;
  const createCommunityBody = {
    name: handle,
    visibility: "public",
    nsfw: false,
    auto_archive_days: 30,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const created: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: createCommunityBody },
    );
  typia.assert(created);

  // 3) Business assertions (echo checks)
  TestValidator.equals(
    "community name echoes input",
    created.name,
    createCommunityBody.name,
  );
  TestValidator.equals(
    "community visibility echoes input (allowed set)",
    created.visibility,
    createCommunityBody.visibility,
  );
  TestValidator.equals(
    "community nsfw echoes input",
    created.nsfw,
    createCommunityBody.nsfw,
  );
  TestValidator.equals(
    "community auto_archive_days echoes input",
    created.auto_archive_days,
    createCommunityBody.auto_archive_days,
  );
}
