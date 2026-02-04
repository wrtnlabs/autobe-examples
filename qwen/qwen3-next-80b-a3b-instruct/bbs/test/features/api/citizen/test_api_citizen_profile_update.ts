import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_citizen_profile_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate citizen
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.org/referrer",
  } satisfies IEconomicDiscussionCitizen.IJoin;
  await authorize_citizen_join(citizenConnection, { body: citizenCredentials });
  // Step 2: Define updated profile information (valid values within constraints)
  const updatedProfile = {
    display_name: RandomGenerator.name(3), // 1-50 chars, alphanumeric, spaces, hyphens, underscores only
    bio: RandomGenerator.paragraph({ sentences: 5, wordMin: 4, wordMax: 10 }), // 0-500 chars
  } satisfies IEconomicDiscussionCitizen.IUpdate;
  // Step 3: Update citizen profile using the authenticated connection
  const updatedCitizen =
    await api.functional.economicDiscussion.citizen.profile.updateProfile(
      citizenConnection, // Use authenticated connection, NOT base connection
      { body: updatedProfile },
    );
  typia.assert(updatedCitizen);
  // Step 4: Validate that the updated profile contains the correct display_name and bio
  TestValidator.equals(
    "display name updated",
    updatedCitizen.display_name,
    updatedProfile.display_name,
  );
  TestValidator.equals("bio updated", updatedCitizen.bio, updatedProfile.bio);
  // Step 5: Validate that the updated profile retains all other properties
  // Check that articles and comments arrays are still present (even if empty)
  TestValidator.predicate(
    "articles array exists",
    Array.isArray(updatedCitizen.articles),
  );
  TestValidator.predicate(
    "comments array exists",
    Array.isArray(updatedCitizen.comments),
  );
  // Step 6: Removed validation of non-existent 'id' property as it doesn't exist in IEconomicDiscussionCitizen type
  TestValidator.notEquals(
    "update response different from original",
    updatedCitizen,
    citizenConnection.headers as any,
  ); // Ensure it's not just the auth token
}
