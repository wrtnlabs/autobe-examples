import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
export function prepare_random_discussion_board_article_image(
  input?: DeepPartial<IDiscussionBoardArticleImage.ICreate> | undefined,
): IDiscussionBoardArticleImage.ICreate {
  return {
    name:
      input?.name ??
      `${RandomGenerator.alphabets(10)}.${RandomGenerator.pick(["png", "jpg", "jpeg", "gif", "webp", "svg"] as const)}`,
    extension:
      input?.extension ??
      RandomGenerator.pick([
        "png",
        "jpg",
        "jpeg",
        "gif",
        "webp",
        "svg",
      ] as const),
    url:
      input?.url ??
      `https://cdn.example.com/uploads/${typia.random<string & tags.Format<"uuid">>()}.${input?.extension ?? RandomGenerator.pick(["png", "jpg", "jpeg", "gif", "webp", "svg"] as const)}`,
    ip:
      input?.ip ??
      (RandomGenerator.pick([true, false] as const)
        ? typia.random<string & tags.Format<"ipv4">>()
        : null),
    href:
      input?.href ??
      `https://example.com/articles/${typia.random<string & tags.Format<"uuid">>()}`,
    referrer:
      input?.referrer ??
      `https://example.com/search?q=${RandomGenerator.alphabets(6)}`,
    article_id:
      input?.article_id ?? typia.random<string & tags.Format<"uuid">>(),
    citizen_id:
      input?.citizen_id ?? typia.random<string & tags.Format<"uuid">>(),
    mime_type:
      (input?.mime_type ??
      (input?.extension ??
        RandomGenerator.pick([
          "png",
          "jpg",
          "jpeg",
          "gif",
          "webp",
          "svg",
        ] as const)) === "png")
        ? "image/png"
        : (input?.extension ??
              RandomGenerator.pick([
                "png",
                "jpg",
                "jpeg",
                "gif",
                "webp",
                "svg",
              ] as const)) === "jpg" ||
            (input?.extension ??
              RandomGenerator.pick([
                "png",
                "jpg",
                "jpeg",
                "gif",
                "webp",
                "svg",
              ] as const)) === "jpeg"
          ? "image/jpeg"
          : (input?.extension ??
                RandomGenerator.pick([
                  "png",
                  "jpg",
                  "jpeg",
                  "gif",
                  "webp",
                  "svg",
                ] as const)) === "gif"
            ? "image/gif"
            : (input?.extension ??
                  RandomGenerator.pick([
                    "png",
                    "jpg",
                    "jpeg",
                    "gif",
                    "webp",
                    "svg",
                  ] as const)) === "webp"
              ? "image/webp"
              : "image/svg+xml",
    size:
      input?.size ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5242880>
      >(),
    width:
      input?.width ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5000>
      >(),
    height:
      input?.height ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5000>
      >(),
    thumbnail_url:
      input?.thumbnail_url ??
      `https://cdn.example.com/thumbnails/${typia.random<string & tags.Format<"uuid">>()}.${input?.extension ?? RandomGenerator.pick(["png", "jpg", "jpeg", "gif", "webp", "svg"] as const)}`,
    status:
      input?.status ??
      RandomGenerator.pick([
        "pending",
        "processing",
        "active",
        "failed",
      ] as const),
  };
}
