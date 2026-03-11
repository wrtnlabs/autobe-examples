import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentSnapshot";
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

export async function test_api_attachment_snapshot_retrieval_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
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
  typia.assert(memberAuth);
  // Create article as member
  const article = await generate_random_discussion_board_member_articles_create(
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
  typia.assert(article);
  // Add attachment to article
  const attachment =
    await generate_random_discussion_board_member_articles_attachments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          filename: RandomGenerator.name() + ".txt",
          filetype: "txt",
          mime_type: "text/plain",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Since attachment snapshots are system-generated records for audit purposes,
  // we need to assume the system creates them automatically when attachments are created.
  // We'll use the attachment ID to retrieve its associated snapshot.
  // Note: This assumes the snapshot ID is the same as the attachment ID for simplicity.
  // In a real system, there would be a separate snapshot creation mechanism.
  // Retrieve attachment snapshot as admin
  const snapshot =
    await api.functional.discussionBoard.admin.attachment_snapshots.at(
      adminConnection,
      {
        snapshotId: attachment.id, // Using attachment ID as snapshot ID for this test
      },
    );
  typia.assert(snapshot);
  // Validate snapshot metadata
  TestValidator.equals("snapshot has valid ID", typeof snapshot.id, "string");
  TestValidator.equals(
    "attachment ID matches parent",
    snapshot.discussion_board_attachment_id,
    attachment.id,
  );
  TestValidator.predicate(
    "captured_at timestamp is valid",
    () => new Date(snapshot.captured_at).getTime() > 0,
  );
  TestValidator.predicate(
    "created_at timestamp is valid",
    () => new Date(snapshot.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp is valid",
    () => new Date(snapshot.updated_at).getTime() > 0,
  );
  TestValidator.equals(
    "deleted_at is null for active snapshot",
    snapshot.deleted_at,
    null,
  );
  // Validate parent attachment relationship
  TestValidator.equals(
    "attachment filename matches",
    snapshot.attachment.filename,
    attachment.filename,
  );
  TestValidator.equals(
    "attachment filetype matches",
    snapshot.attachment.filetype,
    attachment.filetype,
  );
  TestValidator.equals(
    "attachment mime_type matches",
    snapshot.attachment.mime_type,
    attachment.mime_type,
  );
  TestValidator.equals(
    "attachment size_bytes matches",
    snapshot.attachment.size_bytes,
    attachment.size_bytes,
  );
  TestValidator.equals(
    "attachment article_id matches",
    snapshot.attachment.article_id,
    article.id,
  );
  TestValidator.predicate(
    "attachment storage_path is present",
    snapshot.attachment.storage_path.length > 0,
  );
  TestValidator.predicate(
    "attachment created_at is valid",
    () => new Date(snapshot.attachment.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "attachment updated_at is valid",
    () => new Date(snapshot.attachment.updated_at).getTime() > 0,
  );
}
