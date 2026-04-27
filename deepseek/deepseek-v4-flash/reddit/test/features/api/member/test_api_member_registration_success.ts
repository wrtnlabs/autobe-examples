import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member with complete valid credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = RandomGenerator.name(1);
  const password: string = RandomGenerator.alphaNumeric(16);
  const output: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email,
        username,
        password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(output);
  // 2. Validate identity fields match input
  TestValidator.equals("email matches input", output.email, email);
  TestValidator.equals("username matches input", output.username, username);
  // 3. Validate profile defaults
  TestValidator.equals(
    "display_name equals username initially",
    output.profile.display_name,
    username,
  );
  TestValidator.equals(
    "biography is null on registration",
    output.profile.biography,
    null,
  );
  TestValidator.equals(
    "avatar_uri is null on registration",
    output.profile.avatar_uri,
    null,
  );
  TestValidator.equals("karma starts at 0", output.profile.karma, 0);
  // 4. Validate timestamps
  TestValidator.predicate("created_at is recent", () => {
    const created: number = new Date(output.created_at).getTime();
    const now: number = Date.now();
    return now - created < 5 * 60 * 1000;
  });
  TestValidator.equals(
    "updated_at equals created_at on fresh registration",
    output.updated_at,
    output.created_at,
  );
  // 5. Validate active account status
  TestValidator.equals(
    "deleted_at is null for active account",
    output.deleted_at,
    null,
  );
  // 6. Validate token timestamps are in the future
  TestValidator.predicate("access token expired_at is in the future", () => {
    return new Date(output.token.expired_at).getTime() > Date.now();
  });
  TestValidator.predicate("refreshable_until is in the future", () => {
    return new Date(output.token.refreshable_until).getTime() > Date.now();
  });
  // 7. Validate nested member summary matches top-level identity
  TestValidator.equals(
    "nested member id matches top-level id",
    output.profile.member.id,
    output.id,
  );
  TestValidator.equals(
    "nested member email matches top-level email",
    output.profile.member.email,
    output.email,
  );
  TestValidator.equals(
    "nested member username matches top-level username",
    output.profile.member.username,
    output.username,
  );
  TestValidator.equals(
    "nested member created_at matches top-level created_at",
    output.profile.member.created_at,
    output.created_at,
  );
  TestValidator.equals(
    "nested member deleted_at is null",
    output.profile.member.deleted_at,
    null,
  );
}
