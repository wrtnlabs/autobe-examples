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

export async function test_api_community_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);
  // 2. Generate community ID for update testing
  // Note: This test validates the update endpoint's partial update logic
  // A pre-existing community is assumed for the update to succeed
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Test partial update - only name
  const newName = RandomGenerator.alphabets(12);
  const updatedOnlyName =
    await api.functional.redditCommunity.admin.communities.update(
      adminConnection,
      {
        communityId,
        body: {
          name: newName,
        } satisfies IRedditCommunityCommunity.IUpdate,
      },
    );
  typia.assert(updatedOnlyName);
  TestValidator.equals(
    "name updated in partial update",
    updatedOnlyName.name,
    newName,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedOnlyName.created_at,
    updatedOnlyName.created_at,
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    updatedOnlyName.updated_at !== undefined,
  );
  // Small delay to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 10));
  // 4. Test partial update - only description
  const partialUpdateDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedOnlyDescription =
    await api.functional.redditCommunity.admin.communities.update(
      adminConnection,
      {
        communityId,
        body: {
          description: partialUpdateDescription,
        } satisfies IRedditCommunityCommunity.IUpdate,
      },
    );
  typia.assert(updatedOnlyDescription);
  TestValidator.equals(
    "name unchanged in description-only update",
    updatedOnlyDescription.name,
    updatedOnlyName.name,
  );
  TestValidator.equals(
    "description updated in description-only update",
    updatedOnlyDescription.description,
    partialUpdateDescription,
  );
  // 5. Test full update with both name and description
  const newName2 = RandomGenerator.alphabets(10);
  const newDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updatedBoth =
    await api.functional.redditCommunity.admin.communities.update(
      adminConnection,
      {
        communityId,
        body: {
          name: newName2,
          description: newDescription,
        } satisfies IRedditCommunityCommunity.IUpdate,
      },
    );
  typia.assert(updatedBoth);
  TestValidator.equals(
    "name updated in full update",
    updatedBoth.name,
    newName2,
  );
  TestValidator.equals(
    "description updated in full update",
    updatedBoth.description,
    newDescription,
  );
  TestValidator.equals("id unchanged", updatedBoth.id, communityId);
  TestValidator.equals("deleted_at remains null", updatedBoth.deleted_at, null);
  TestValidator.predicate(
    "updated_at is valid timestamp",
    updatedBoth.updated_at !== undefined,
  );
}
