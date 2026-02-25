import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_admin_sections_images_create } from "../../../generate/generate_random_discussion_board_admin_sections_images_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_section_image } from "../../../prepare/prepare_random_discussion_board_section_image";

export async function test_api_section_image_metadata_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create a new section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Upload section image
  const imageBody = {
    filename: `test-image-${RandomGenerator.alphaNumeric(8)}.jpg`,
    mime_type: "image/jpeg",
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<5000000>
    >(),
    width: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
    >(),
    height: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
    >(),
    image_type: RandomGenerator.pick([
      "banner",
      "icon",
      "promotional",
      "thumbnail",
    ] as const),
    storage_path: `/sections/${section.id}/images/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
    alt_text: RandomGenerator.pick([
      RandomGenerator.paragraph({ sentences: 1 }),
      null,
    ]),
  } satisfies IDiscussionBoardSectionImage.ICreate;
  const uploadedImage =
    await generate_random_discussion_board_admin_sections_images_create(
      adminConnection,
      {
        body: imageBody,
        params: { sectionId: section.id },
      },
    );
  typia.assert(uploadedImage);
  // Retrieve image metadata
  const retrievedImage =
    await api.functional.discussionBoard.admin.sections.images.at(
      adminConnection,
      {
        sectionId: section.id,
        imageId: uploadedImage.id,
      },
    );
  typia.assert(retrievedImage);
  // Validate metadata fields match
  TestValidator.equals("image ID matches", retrievedImage.id, uploadedImage.id);
  TestValidator.equals(
    "filename matches",
    retrievedImage.filename,
    imageBody.filename,
  );
  TestValidator.equals(
    "MIME type matches",
    retrievedImage.mime_type,
    imageBody.mime_type,
  );
  TestValidator.equals(
    "file size matches",
    retrievedImage.file_size,
    imageBody.file_size,
  );
  TestValidator.equals("width matches", retrievedImage.width, imageBody.width);
  TestValidator.equals(
    "height matches",
    retrievedImage.height,
    imageBody.height,
  );
  TestValidator.equals(
    "image type matches",
    retrievedImage.image_type,
    imageBody.image_type,
  );
  TestValidator.equals(
    "storage path matches",
    retrievedImage.storage_path,
    imageBody.storage_path,
  );
  TestValidator.equals(
    "alt text matches",
    retrievedImage.alt_text,
    imageBody.alt_text,
  );
  // Validate file size and dimensions are positive
  TestValidator.predicate("file size positive", retrievedImage.file_size > 0);
  TestValidator.predicate("width positive", retrievedImage.width > 0);
  TestValidator.predicate("height positive", retrievedImage.height > 0);
  // Test accessibility compliance - alt text can be null
  TestValidator.predicate(
    "alt text nullable",
    retrievedImage.alt_text === null ||
      typeof retrievedImage.alt_text === "string",
  );
}
