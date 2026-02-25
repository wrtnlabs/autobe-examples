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

export async function test_api_sections_image_type_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin
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
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Create images with different types
  const imageTypes = ["banner", "icon", "promotional", "thumbnail"] as const;
  const createdImages: IDiscussionBoardSection.Image[] = [];
  for (const imageType of imageTypes) {
    const image =
      await generate_random_discussion_board_admin_sections_images_create(
        adminConnection,
        {
          params: { sectionId: section.id },
          body: {
            filename: `${RandomGenerator.alphabets(8)}.png`,
            mime_type: "image/png",
            file_size: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1000> &
                tags.Maximum<5000000>
            >(),
            width: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<100> &
                tags.Maximum<2000>
            >(),
            height: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<100> &
                tags.Maximum<2000>
            >(),
            image_type: imageType,
            storage_path: `/sections/${section.id}/images/${typia.random<string & tags.Format<"uuid">>()}`,
            alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IDiscussionBoardSectionImage.ICreate,
        },
      );
    typia.assert(image);
    createdImages.push(image);
  }
  // Attempt to update an image with a duplicate type
  const imageToUpdate = createdImages[0]; // Use the first image
  const duplicateType = createdImages[1].image_type; // Use type from second image
  // This should fail due to duplicate type constraint
  await TestValidator.error("duplicate image type prevention", async () => {
    await api.functional.discussionBoard.admin.sections.images.update(
      adminConnection,
      {
        sectionId: section.id,
        imageId: imageToUpdate.id,
        body: {
          image_type: duplicateType,
        } satisfies IDiscussionBoardSectionImage.IUpdate,
      },
    );
  });
  // Verify that updating with a unique type still works
  const uniqueType =
    imageTypes.find(
      (type) => !createdImages.some((img) => img.image_type === type),
    ) || "banner"; // Fallback if all types are used
  const updatedImage =
    await api.functional.discussionBoard.admin.sections.images.update(
      adminConnection,
      {
        sectionId: section.id,
        imageId: imageToUpdate.id,
        body: {
          image_type: uniqueType,
        } satisfies IDiscussionBoardSectionImage.IUpdate,
      },
    );
  typia.assert(updatedImage);
  TestValidator.equals(
    "image type updated successfully",
    updatedImage.image_type,
    uniqueType,
  );
}
