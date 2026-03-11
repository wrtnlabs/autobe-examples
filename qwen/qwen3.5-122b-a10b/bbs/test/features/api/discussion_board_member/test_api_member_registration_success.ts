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

export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate valid registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16); // Meets min 8 char requirement
  const displayName = RandomGenerator.name();
  const bio = RandomGenerator.paragraph({ sentences: 3 });
  // Register member using utility function
  const member = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      displayName,
      bio,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Validate response structure
  typia.assert(member);
  // Validate member profile data
  TestValidator.equals("email matches input", member.email, email);
  TestValidator.equals(
    "display name matches input",
    member.display_name,
    displayName,
  );
  TestValidator.equals("bio matches input", member.bio, bio);
  TestValidator.equals("ban status is active", member.ban_status, "active");
  // Validate token structure
  TestValidator.equals("token type is Bearer", member.token_type, "Bearer");
  TestValidator.equals("expires in is 3600", member.expires_in, 3600);
  // Validate authorization token structure
  typia.assert(member.token);
  // Validate audit trail fields
  TestValidator.equals(
    "article_count initialized to 0",
    member.article_count,
    0,
  );
  TestValidator.equals(
    "comment_count initialized to 0",
    member.comment_count,
    0,
  );
  TestValidator.equals("deleted_at is null", member.deleted_at, null);
  // Test duplicate email error scenario
  await TestValidator.error("duplicate email should fail", async () => {
    const duplicateConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(duplicateConnection, {
      body: {
        email,
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  });
}
