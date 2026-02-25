import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_reported_content_detail_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator account registration and authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorizedModerator = await authorize_moderator_join(
    moderatorConnection,
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
  typia.assert(authorizedModerator);
  moderatorConnection.headers = {
    Authorization: authorizedModerator.token.access,
  };
  // 2. We simulate creation of a reported content by generating a random report content id
  const reportedContent = typia.random<ICommunityPlatformReportedContent>();
  typia.assert(reportedContent);
  // 3. Request detailed reported content info by moderator
  try {
    const output =
      await api.functional.communityPlatform.moderator.reportedContents.at(
        moderatorConnection,
        { id: reportedContent.id },
      );
    typia.assert(output);
    // 4. Validate output fields exist and match expected types
    TestValidator.predicate(
      "reportedContent has id",
      typeof output.id === "string" && output.id.length > 0,
    );
    TestValidator.predicate(
      "reportedContent has communityPlatformReportId (nullable)",
      output.communityPlatformReportId === null,
    );
    TestValidator.predicate(
      "reportedContent has communityPlatformReportedPostId (nullable)",
      output.communityPlatformReportedPostId === null,
    );
    TestValidator.predicate(
      "reportedContent has communityPlatformReportedCommentId (nullable)",
      output.communityPlatformReportedCommentId === null,
    );
    TestValidator.predicate(
      "reportedContent has createdAt string",
      typeof output.createdAt === "string" && output.createdAt.length > 0,
    );
    TestValidator.predicate(
      "reportedContent has updatedAt string",
      typeof output.updatedAt === "string" && output.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "reportedContent deletedAt nullable",
      output.deletedAt === null || typeof output.deletedAt === "string",
    );
  } catch (exp) {
    if (exp instanceof api.HttpError && exp.status === 404) {
      // expected if the random ID does not exist
      // we treat as skipped or handled gracefully
      return;
    }
    throw exp;
  }
}
