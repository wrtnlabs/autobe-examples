import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import api from "@ORGANIZATION/PROJECT-api";
import { prepare_random_community_platform_subscription } from "../prepare/prepare_random_community_platform_subscription";

export async function generate_random_community_platform_member_subscriptions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformSubscription.ICreate>;
  }
): Promise<ICommunityPlatformSubscription> {
  const prepared: ICommunityPlatformSubscription.ICreate = prepare_random_community_platform_subscription(
    props.body
  );
  const result: ICommunityPlatformSubscription = await api.functional.communityPlatform.member.subscriptions.create(
    connection,
    { body: prepared }
  );
  return result;
}