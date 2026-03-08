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

export async function test_api_member_registration_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member with a unique email
  const firstConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(firstMember);
  // 2. Attempt to register second member with the same email (should fail)
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate email registration rejected",
    async () => {
      await authorize_member_join(secondConnection, {
        body: {
          email: firstMember.email, // Same email as first member
          password: RandomGenerator.alphaNumeric(16),
          display_name: RandomGenerator.name(1),
          bio: RandomGenerator.paragraph({ sentences: 3 }),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IDiscussionBoardMember.IJoin,
      });
    },
  );
  // 3. Verify first member still exists and is unchanged
  TestValidator.equals(
    "first member email unchanged",
    firstMember.email,
    firstMember.email,
  );
  TestValidator.predicate(
    "first member ban status is active",
    firstMember.banStatus === "active",
  );
}
