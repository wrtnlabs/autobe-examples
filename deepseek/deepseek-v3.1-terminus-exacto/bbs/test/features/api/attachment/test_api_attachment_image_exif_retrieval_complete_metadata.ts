import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardImageAttachmentExifDatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardImageAttachmentExifDatum";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_attachments_create } from "../../../generate/generate_random_discussion_board_member_articles_attachments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";

export async function test_api_attachment_image_exif_retrieval_complete_metadata(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
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
  typia.assert(member);
  // Create article
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
  // Create image attachment with rich EXIF metadata
  const attachment =
    await generate_random_discussion_board_member_articles_attachments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          filename: "test-image.jpg",
          filetype: "jpg",
          mime_type: "image/jpeg",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  // Retrieve EXIF metadata using member-specific connection
  const exifData =
    await api.functional.discussionBoard.articles.attachments.image_metadata.exif.at(
      memberConnection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
      },
    );
  typia.assert(exifData);
  // Validate EXIF metadata contains expected photographic information
  TestValidator.predicate(
    "EXIF data should contain photographic metadata",
    exifData.camera_make !== undefined ||
      exifData.camera_model !== undefined ||
      exifData.exposure_time !== undefined ||
      exifData.f_number !== undefined ||
      exifData.iso_speed !== undefined ||
      exifData.lens_model !== undefined ||
      exifData.focal_length !== undefined ||
      exifData.capture_date !== undefined,
  );
  // Validate that numeric fields are positive when present
  if (exifData.iso_speed !== null && exifData.iso_speed !== undefined) {
    TestValidator.predicate(
      "ISO speed should be positive",
      exifData.iso_speed > 0,
    );
  }
  if (exifData.focal_length !== null && exifData.focal_length !== undefined) {
    TestValidator.predicate(
      "Focal length should be positive",
      exifData.focal_length > 0,
    );
  }
  // Validate GPS coordinates are within valid ranges when present
  if (exifData.gps_latitude !== null && exifData.gps_latitude !== undefined) {
    TestValidator.predicate(
      "GPS latitude should be valid",
      exifData.gps_latitude >= -90 && exifData.gps_latitude <= 90,
    );
  }
  if (exifData.gps_longitude !== null && exifData.gps_longitude !== undefined) {
    TestValidator.predicate(
      "GPS longitude should be valid",
      exifData.gps_longitude >= -180 && exifData.gps_longitude <= 180,
    );
  }
}
