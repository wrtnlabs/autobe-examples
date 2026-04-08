import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_duplicate_username(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first member connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate a unique email for the first member
  const firstEmail = typia.random<string & tags.Format<"email">>();
  // Generate a random username for the first member
  const duplicateUsername = RandomGenerator.alphabets(12);
  // Register the first member successfully
  const firstMember = await authorize_member_join(memberConnection, {
    body: {
      email: firstEmail,
      password: RandomGenerator.alphaNumeric(16),
      username: duplicateUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(firstMember);
  // Step 2: Attempt to register second member with the same username
  const secondEmail = typia.random<string & tags.Format<"email">>();
  // Validate that registering with duplicate username throws an error
  await TestValidator.error(
    "duplicate username should be rejected",
    async () => {
      const secondConnection: api.IConnection = { host: connection.host };
      await authorize_member_join(secondConnection, {
        body: {
          email: secondEmail,
          password: RandomGenerator.alphaNumeric(16),
          username: duplicateUsername,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCloneMember.IJoin,
      });
    },
  );
}
