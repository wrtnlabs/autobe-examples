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

/**
 * Test updating section image metadata including filename, MIME type, image type classification,
 * and accessibility text. Verify that only modifiable fields can be updated while preserving
 * system-managed fields like file dimensions and storage path.
 */
export async function test_api_section_image_update_metadata(
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
  // Create initial section image
  const initialImage =
    await generate_random_discussion_board_admin_sections_images_create(
      adminConnection,
      {
        params: { sectionId: section.id },
        body: {
          filename: `${RandomGenerator.alphabets(8)}.jpg`,
          mime_type: "image/jpeg",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<5000000>
          >(),
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<2000>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<2000>
          >(),
          image_type: "banner" as const,
          storage_path: `/images/sections/${section.id}/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSectionImage.ICreate,
      },
    );
  typia.assert(initialImage);
  // Update image metadata
  const updateData: IDiscussionBoardSectionImage.IUpdate = {
    filename: `${RandomGenerator.alphabets(10)}.png`,
    mime_type: "image/png",
    image_type: "promotional",
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const updatedImage =
    await api.functional.discussionBoard.admin.sections.images.update(
      adminConnection,
      {
        sectionId: section.id,
        imageId: initialImage.id,
        body: updateData,
      },
    );
  typia.assert(updatedImage);
  // Validate updated fields
  TestValidator.equals(
    "filename updated",
    updatedImage.filename,
    updateData.filename,
  );
  TestValidator.equals(
    "mime_type updated",
    updatedImage.mime_type,
    updateData.mime_type,
  );
  TestValidator.equals(
    "image_type updated",
    updatedImage.image_type,
    updateData.image_type,
  );
  TestValidator.equals(
    "alt_text updated",
    updatedImage.alt_text,
    updateData.alt_text,
  );
  // Validate preserved system-managed fields
  TestValidator.equals(
    "file_size preserved",
    updatedImage.file_size,
    initialImage.file_size,
  );
  TestValidator.equals(
    "width preserved",
    updatedImage.width,
    initialImage.width,
  );
  TestValidator.equals(
    "height preserved",
    updatedImage.height,
    initialImage.height,
  );
  TestValidator.equals(
    "storage_path preserved",
    updatedImage.storage_path,
    initialImage.storage_path,
  );
  // Validate section relationship
  TestValidator.equals(
    "section id preserved",
    updatedImage.section.id,
    section.id,
  );
  TestValidator.equals(
    "section name preserved",
    updatedImage.section.name,
    section.name,
  );
}
