import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Prepare member registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  const bio = RandomGenerator.paragraph({ sentences: 3 });
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Register member using utility function
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      displayName,
      bio,
      href,
      referrer,
      ip,
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(authorized);
  // Validate member profile matches request input
  TestValidator.equals("email matches", authorized.email, email);
  TestValidator.equals(
    "displayName matches",
    authorized.displayName,
    displayName,
  );
  TestValidator.equals("bio matches", authorized.bio, bio);
  // Validate account status
  TestValidator.equals("banned is false", authorized.banned, false);
  TestValidator.equals("deletedAt is null", authorized.deletedAt, null);
}
