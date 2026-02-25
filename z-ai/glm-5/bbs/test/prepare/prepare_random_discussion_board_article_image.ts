import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
export function prepare_random_discussion_board_article_image(input?: DeepPartial<IDiscussionBoardArticleImage.ICreate>): IDiscussionBoardArticleImage.ICreate {
    return {
        original_filename: input?.original_filename ?? `${RandomGenerator.alphabets(8)}.${RandomGenerator.pick(["jpg", "png", "gif", "webp", "bmp"] as const)}`,
        storage_path: input?.storage_path ?? `https://storage.example.com/${RandomGenerator.alphabets(16)}`,
        file_size: input?.file_size ?? typia.random<number & tags.Type<"int32"> & tags.Minimum<1024> & tags.Maximum<5242880>>(),
        mime_type: input?.mime_type ?? RandomGenerator.pick(["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"] as const),
        width: input?.width ?? typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<8000>>(),
        height: input?.height ?? typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<8000>>(),
    };
}