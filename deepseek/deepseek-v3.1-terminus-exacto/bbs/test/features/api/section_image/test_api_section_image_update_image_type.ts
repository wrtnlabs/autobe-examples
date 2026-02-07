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

export async function test_api_section_image_update_image_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
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
  // 2. Create a section for image attachment
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Create initial section image with 'banner' type
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
          storage_path: `/sections/${section.id}/images/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSectionImage.ICreate,
      },
    );
  typia.assert(initialImage);
  // 4. Test updating image_type to all allowed values
  const allowedImageTypes = ["icon", "promotional", "thumbnail"] as const;
  let currentImage = initialImage;
  for (const newImageType of allowedImageTypes) {
    const updatedImage =
      await api.functional.discussionBoard.admin.sections.images.update(
        adminConnection,
        {
          sectionId: section.id,
          imageId: currentImage.id,
          body: {
            image_type: newImageType,
          } satisfies IDiscussionBoardSectionImage.IUpdate,
        },
      );
    typia.assert(updatedImage);
    // Validate that image_type was updated correctly
    TestValidator.equals(
      `image_type should be updated to ${newImageType}`,
      updatedImage.image_type,
      newImageType,
    );
    // Validate that other metadata remains unchanged from original
    TestValidator.equals(
      `filename should remain unchanged after ${newImageType} update`,
      updatedImage.filename,
      initialImage.filename,
    );
    TestValidator.equals(
      `mime_type should remain unchanged after ${newImageType} update`,
      updatedImage.mime_type,
      initialImage.mime_type,
    );
    TestValidator.equals(
      `file_size should remain unchanged after ${newImageType} update`,
      updatedImage.file_size,
      initialImage.file_size,
    );
    TestValidator.equals(
      `width should remain unchanged after ${newImageType} update`,
      updatedImage.width,
      initialImage.width,
    );
    TestValidator.equals(
      `height should remain unchanged after ${newImageType} update`,
      updatedImage.height,
      initialImage.height,
    );
    TestValidator.equals(
      `storage_path should remain unchanged after ${newImageType} update`,
      updatedImage.storage_path,
      initialImage.storage_path,
    );
    TestValidator.equals(
      `alt_text should remain unchanged after ${newImageType} update`,
      updatedImage.alt_text,
      initialImage.alt_text,
    );
    // Update reference for next iteration
    currentImage = updatedImage;
  }
  // 5. Test that section association remains consistent
  TestValidator.equals(
    "section ID should remain consistent throughout updates",
    currentImage.section.id,
    section.id,
  );
}
