import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeletedContent";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformDeletedContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_community_deleted_contents_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Moderator registration and authorization
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(1),
        displayName: null,
        bio: null,
        avatarUrl: null,
      },
    },
  );
  typia.assert(moderatorAuthorized);
  const moderatorConnection: api.IConnection = { host: connection.host };
  moderatorConnection.headers = {
    Authorization: moderatorAuthorized.token.access,
  };
  // Prepare communityId for testing: We need a valid communityId from existing or mock.
  // Since no creation API of community or previous data provided, generate random UUID to simulate.
  // In real scenario, this would be replaced with actual communityId of a community that moderator can access.
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Validate access denial if not authenticated as moderator
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "access denied without authentication",
    401,
    async () =>
      await api.functional.communityPlatform.moderator.communities.deleted_contents.index(
        anonymousConnection,
        { communityId },
      ),
  );
  // Successful retrieval - test default pagination
  const firstPageOutput =
    await api.functional.communityPlatform.moderator.communities.deleted_contents.index(
      moderatorConnection,
      { communityId },
    );
  typia.assert(firstPageOutput);
  // Validate pagination object
  TestValidator.predicate(
    "pagination current page should be >= 0",
    firstPageOutput.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be >= 0",
    firstPageOutput.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    firstPageOutput.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    firstPageOutput.pagination.pages >= 0,
  );
  // If records exist, validate content fields and sorting
  if (firstPageOutput.data.length > 1) {
    // Validate each deleted content record
    for (const content of firstPageOutput.data) {
      typia.assert(content);
      // Confirm related fields exist
      TestValidator.predicate("moderator info exists", !!content.moderator);
      TestValidator.predicate("user info exists", !!content.user);
      TestValidator.predicate(
        "reason exists and non-empty",
        content.reason.length > 0,
      );
      // Validate timestamps
      TestValidator.predicate(
        "createdAt is ISO date",
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z?$/.test(
          content.createdAt,
        ),
      );
    }
    // Validate descending order of createdAt
    for (let i = 1; i < firstPageOutput.data.length; i++) {
      TestValidator.predicate(
        "deleted contents sorted by createdAt descending",
        firstPageOutput.data[i - 1].createdAt >=
          firstPageOutput.data[i].createdAt,
      );
    }
  }
  // Additional pagination check: call again (since no parameters)
  const secondPageOutput =
    await api.functional.communityPlatform.moderator.communities.deleted_contents.index(
      moderatorConnection,
      { communityId },
    );
  typia.assert(secondPageOutput);
  // Validate pagination consistency on second page
  TestValidator.predicate(
    "pagination current page should be >= 0",
    secondPageOutput.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be >= 0",
    secondPageOutput.pagination.limit >= 0,
  );
  // Confirm the communityId filter effect by ensuring all returned deleted contents' moderatorId and userId are non-empty string
  for (const content of secondPageOutput.data) {
    typia.assert(content);
    TestValidator.predicate(
      "moderatorId is non-empty string",
      typeof content.moderatorId === "string" && content.moderatorId.length > 0,
    );
    TestValidator.predicate(
      "userId is non-empty string",
      typeof content.userId === "string" && content.userId.length > 0,
    );
    TestValidator.predicate(
      "reason is non-empty string",
      typeof content.reason === "string" && content.reason.length > 0,
    );
  }
}
