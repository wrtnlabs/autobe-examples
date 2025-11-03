import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotificationFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationFailure";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function test_api_notification_failure_retrieval_by_owner_success(
  connection: api.IConnection,
) {
  // 1) Register a new member and obtain authenticated context
  const joinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassw0rd!", // >=12 chars and mixed categories
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/initial",
    referrer: "https://example.com/ref",
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2) Create an article while authenticated (establishes content context)
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(article);

  // 3) Prepare notificationId and attemptNumber for retrieval
  // NOTE: Notification creation is out of scope for available SDK functions.
  // The test assumes the environment has a fixture or background process
  // that created a notification failure record for this combination.
  const notificationId = typia.random<string & tags.Format<"uuid">>();
  const attemptNumber = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();

  // 4) Retrieve the failure as the member (owner)
  const failure: IDiscussionBoardNotificationFailure =
    await api.functional.discussionBoard.member.members.notifications.failures.at(
      connection,
      {
        memberUsername: member.username,
        notificationId,
        attemptNumber,
      },
    );
  typia.assert(failure);

  // Business assertions
  TestValidator.equals(
    "notification id matches requested id",
    failure.notificationId,
    notificationId,
  );
  TestValidator.equals(
    "attempt number matches requested attempt",
    failure.attemptNumber,
    attemptNumber,
  );

  // typia.assert already validates date-time formats; perform business-level checks
  TestValidator.predicate(
    "attemptedAt is present",
    typeof failure.attemptedAt === "string" && failure.attemptedAt.length > 0,
  );

  // errorCode is optional per DTO; prefer known tokens when present
  const known = ["SMTP_TIMEOUT", "BOUNCED"] as const;
  TestValidator.predicate(
    "errorCode is null or a known token",
    failure.errorCode === null ||
      failure.errorCode === undefined ||
      (typeof failure.errorCode === "string" &&
        known.includes(failure.errorCode as any)),
  );

  // errorMessage should be non-empty when present
  TestValidator.predicate(
    "errorMessage is non-empty when present",
    failure.errorMessage === null ||
      failure.errorMessage === undefined ||
      (typeof failure.errorMessage === "string" &&
        failure.errorMessage.length > 0),
  );

  // backoffUntil is nullable; typia.assert will have validated format if present
  TestValidator.predicate(
    "backoffUntil is null or ISO date string when present",
    failure.backoffUntil === null ||
      failure.backoffUntil === undefined ||
      (typeof failure.backoffUntil === "string" &&
        failure.backoffUntil.length > 0),
  );
}
