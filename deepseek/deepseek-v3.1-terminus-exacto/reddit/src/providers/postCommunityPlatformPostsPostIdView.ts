import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostView } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostView";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostViewCollector } from "../collectors/CommunityPlatformPostViewCollector";
import { CommunityPlatformPostViewTransformer } from "../transformers/CommunityPlatformPostViewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformPostsPostIdView(props: {
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostView.ICreate;
}): Promise<ICommunityPlatformPostView> {
  // Validate post exists
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
    },
  );
  // Check if user authentication context is available
  // For anonymous views, user will be null
  const userEntity: IEntity | null = null; // This operation doesn't receive authentication context
  // Create a default anonymous user entity when user is null
  const userForCollector: IEntity = userEntity ?? {
    id: v4(),
  };
  // Create view record using collector
  const view = await MyGlobal.prisma.community_platform_post_views.create({
    data: await CommunityPlatformPostViewCollector.collect({
      body: props.body,
      post: { id: props.postId },
      user: userForCollector satisfies IEntity as IEntity,
    }),
    ...CommunityPlatformPostViewTransformer.select(),
  });
  // Transform and return response
  return await CommunityPlatformPostViewTransformer.transform(view);
}
