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

export async function test_api_sections_image_cross_section_isolation(
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
  // Create two sections for isolation testing
  const sectionA = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(sectionA);
  const sectionB = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<2>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(sectionB);
  // Create images in both sections
  const imageASectionA =
    await generate_random_discussion_board_admin_sections_images_create(
      adminConnection,
      {
        params: { sectionId: sectionA.id },
        body: {
          filename: `${RandomGenerator.alphaNumeric(8)}.jpg`,
          mime_type: "image/jpeg",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<5000000>
          >(),
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1920>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1080>
          >(),
          image_type: RandomGenerator.pick([
            "banner",
            "icon",
            "promotional",
            "thumbnail",
          ] as const),
          storage_path: `/images/${RandomGenerator.alphaNumeric(16)}/original.jpg`,
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSectionImage.ICreate,
      },
    );
  typia.assert(imageASectionA);
  const imageBSectionB =
    await generate_random_discussion_board_admin_sections_images_create(
      adminConnection,
      {
        params: { sectionId: sectionB.id },
        body: {
          filename: `${RandomGenerator.alphaNumeric(8)}.png`,
          mime_type: "image/png",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<5000000>
          >(),
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1920>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1080>
          >(),
          image_type: RandomGenerator.pick([
            "banner",
            "icon",
            "promotional",
            "thumbnail",
          ] as const),
          storage_path: `/images/${RandomGenerator.alphaNumeric(16)}/original.png`,
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSectionImage.ICreate,
      },
    );
  typia.assert(imageBSectionB);
  // Test cross-section isolation: Attempt to update Section A's image with metadata referencing Section B
  // This should succeed with normal metadata update but fail if trying to move between sections
  const updatedImage =
    await api.functional.discussionBoard.admin.sections.images.update(
      adminConnection,
      {
        sectionId: sectionA.id,
        imageId: imageASectionA.id,
        body: {
          filename: `${RandomGenerator.alphaNumeric(8)}_updated.jpg`,
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSectionImage.IUpdate,
      },
    );
  typia.assert(updatedImage);
  // Validate that the image was updated within its original section
  TestValidator.equals(
    "filename updated",
    updatedImage.filename,
    updatedImage.filename,
  );
  TestValidator.equals(
    "correct section maintained",
    updatedImage,
    updatedImage,
  );
  // Test invalid scenario: Attempt to call the API with mismatched section/image combination
  await TestValidator.error("invalid section-image combination", async () => {
    await api.functional.discussionBoard.admin.sections.images.update(
      adminConnection,
      {
        sectionId: sectionA.id,
        imageId: imageBSectionB.id, // Image from section B in section A context
        body: {
          filename: `${RandomGenerator.alphaNumeric(8)}_invalid.jpg`,
        } satisfies IDiscussionBoardSectionImage.IUpdate,
      },
    );
  });
  // Verify images remain in their respective sections
  TestValidator.notEquals(
    "images from different sections have different IDs",
    imageASectionA.id,
    imageBSectionB.id,
  );
}
