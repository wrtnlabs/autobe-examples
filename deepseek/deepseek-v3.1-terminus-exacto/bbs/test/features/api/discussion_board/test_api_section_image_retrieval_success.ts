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

export async function test_api_section_image_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
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
  // Create a section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Upload an image to the section
  const image =
    await generate_random_discussion_board_admin_sections_images_create(
      adminConnection,
      {
        params: { sectionId: section.id },
        body: {
          filename: `test-image-${RandomGenerator.alphabets(8)}.jpg`,
          mime_type: "image/jpeg",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<50000> &
              tags.Maximum<2000000>
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
          storage_path: `/images/sections/${section.id}/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSectionImage.ICreate,
      },
    );
  typia.assert(image);
  // Retrieve the image metadata
  const retrievedImage =
    await api.functional.discussionBoard.admin.sections.images.at(
      adminConnection,
      {
        sectionId: section.id,
        imageId: image.id,
      },
    );
  typia.assert(retrievedImage);
  // Validate all image metadata fields
  TestValidator.equals("image ID matches", retrievedImage.id, image.id);
  TestValidator.equals(
    "filename matches",
    retrievedImage.filename,
    image.filename,
  );
  TestValidator.equals(
    "MIME type matches",
    retrievedImage.mime_type,
    image.mime_type,
  );
  TestValidator.equals(
    "file size matches",
    retrievedImage.file_size,
    image.file_size,
  );
  TestValidator.equals("width matches", retrievedImage.width, image.width);
  TestValidator.equals("height matches", retrievedImage.height, image.height);
  TestValidator.equals(
    "image type matches",
    retrievedImage.image_type,
    image.image_type,
  );
  TestValidator.equals(
    "storage path matches",
    retrievedImage.storage_path,
    image.storage_path,
  );
  TestValidator.equals(
    "alt text matches",
    retrievedImage.alt_text,
    image.alt_text,
  );
  // Validate section relationship
  TestValidator.equals(
    "section ID matches",
    retrievedImage.section.id,
    section.id,
  );
  TestValidator.equals(
    "section name matches",
    retrievedImage.section.name,
    section.name,
  );
  TestValidator.equals(
    "section status matches",
    retrievedImage.section.status,
    section.status,
  );
  TestValidator.equals(
    "section display order matches",
    retrievedImage.section.display_order,
    section.display_order,
  );
}
