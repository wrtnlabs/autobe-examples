import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentDownload } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentDownload";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_attachments_create } from "../../../generate/generate_random_discussion_board_member_articles_attachments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";

export async function test_api_admin_monitoring_attachment_usage_cache_validation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Step 2: Authenticate as member to create articles
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Step 3: Create initial article with attachment
  const article1 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article1);
  const attachment1 =
    await generate_random_discussion_board_member_articles_attachments_create(
      memberConnection,
      {
        body: {
          filename: `test-file-${RandomGenerator.alphaNumeric(8)}.pdf`,
          filetype: "pdf",
          mime_type: "application/pdf",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardAttachment.ICreate,
        params: { articleId: article1.id },
      },
    );
  typia.assert(attachment1);
  // Step 4: Call monitoring endpoint multiple times to test caching
  const firstCall =
    await api.functional.discussionBoard.admin.monitoring.attachment_usage.at(
      adminConnection,
    );
  typia.assert(firstCall);
  const secondCall =
    await api.functional.discussionBoard.admin.monitoring.attachment_usage.at(
      adminConnection,
    );
  typia.assert(secondCall);
  // Step 5: Validate caching behavior - responses should be identical
  TestValidator.equals(
    "cached responses should be identical",
    firstCall,
    secondCall,
  );
  // Step 6: Create additional attachment to change underlying data
  const article2 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article2);
  const attachment2 =
    await generate_random_discussion_board_member_articles_attachments_create(
      memberConnection,
      {
        body: {
          filename: `test-image-${RandomGenerator.alphaNumeric(8)}.jpg`,
          filetype: "jpg",
          mime_type: "image/jpeg",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardAttachment.ICreate,
        params: { articleId: article2.id },
      },
    );
  typia.assert(attachment2);
  // Step 7: Call monitoring endpoint again after data changes
  const thirdCall =
    await api.functional.discussionBoard.admin.monitoring.attachment_usage.at(
      adminConnection,
    );
  typia.assert(thirdCall);
  // Step 8: Validate that monitoring endpoint provides useful analytics
  TestValidator.predicate(
    "monitoring response should contain valid attachment data",
    thirdCall.attachment !== undefined,
  );
  TestValidator.predicate(
    "monitoring response should contain valid download context",
    thirdCall.created_at !== undefined &&
      thirdCall.actor_type !== undefined &&
      thirdCall.ip !== undefined,
  );
  // Step 9: Validate the monitoring endpoint structure
  TestValidator.equals(
    "monitoring response should have correct structure",
    typeof thirdCall.id,
    "string",
  );
  TestValidator.equals(
    "monitoring response should have valid timestamp",
    typeof thirdCall.created_at,
    "string",
  );
}
