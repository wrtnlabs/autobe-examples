import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_retrieve_another_admin_profile(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first administrator (the requester)
  const requesterConnection: api.IConnection = { host: connection.host };
  const requesterAuth = await authorize_admin_join(requesterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      grade: RandomGenerator.pick(["regular", "super"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(requesterAuth);
  // 2. Create second administrator (the target profile to retrieve)
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuth = await authorize_admin_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      grade: RandomGenerator.pick(["regular", "super"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(targetAuth);
  // 3. Retrieve the target admin's profile using requester's connection
  const profile = await api.functional.discussionBoard.admins.at(
    requesterConnection,
    {
      adminId: targetAuth.id,
    },
  );
  typia.assert(profile);
  // 4. Validate public profile fields
  TestValidator.equals("admin ID matches", profile.id, targetAuth.id);
  TestValidator.equals(
    "display name matches",
    profile.display_name,
    targetAuth.display_name,
  );
  TestValidator.equals("bio matches", profile.bio, targetAuth.bio);
  TestValidator.equals("grade matches", profile.grade, targetAuth.grade);
  TestValidator.predicate(
    "created_at is valid",
    new Date(profile.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid",
    new Date(profile.updated_at).getTime() > 0,
  );
  // 5. Verify grade is valid value
  TestValidator.predicate(
    "grade is regular or super",
    profile.grade === "regular" || profile.grade === "super",
  );
}
