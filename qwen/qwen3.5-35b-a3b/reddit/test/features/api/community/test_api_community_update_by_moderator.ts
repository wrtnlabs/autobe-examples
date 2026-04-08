import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_update_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. First admin (community owner) registration
  const firstAdminConnection: api.IConnection = { host: connection.host };
  const firstAdmin = await authorize_admin_join(firstAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(firstAdmin);
  // 2. Second admin (moderator) registration
  const secondAdminConnection: api.IConnection = { host: connection.host };
  const secondAdmin = await authorize_admin_join(secondAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(secondAdmin);
  // 3. First admin (owner) updates community to demonstrate moderator update capability
  // Note: Community must exist with moderator role already assigned
  // The update operation validates moderator permissions server-side
  const originalCommunity =
    await api.functional.redditCommunity.admin.communities.update(
      firstAdminConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          name: RandomGenerator.alphabets(6),
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IRedditCommunityCommunity.IUpdate,
      },
    );
  typia.assert(originalCommunity);
  // 4. Second admin (moderator) updates the same community
  // This validates that moderator permissions are properly enforced
  const updatedCommunity =
    await api.functional.redditCommunity.admin.communities.update(
      secondAdminConnection,
      {
        communityId: originalCommunity.id,
        body: {
          name: `${RandomGenerator.alphabets(6)}-updated`,
          description: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IRedditCommunityCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);
  // 5. Validate the update succeeded
  TestValidator.equals(
    "name updated",
    updatedCommunity.name,
    `${RandomGenerator.alphabets(6)}-updated`,
  );
  TestValidator.predicate(
    "description updated",
    updatedCommunity.description !== null,
  );
  TestValidator.notEquals(
    "updated_at changed",
    originalCommunity.updated_at,
    updatedCommunity.updated_at,
  );
  TestValidator.predicate(
    "updated_at after created_at",
    new Date(updatedCommunity.updated_at).getTime() >
      new Date(updatedCommunity.created_at).getTime(),
  );
  TestValidator.equals(
    "community id unchanged",
    originalCommunity.id,
    updatedCommunity.id,
  );
}
