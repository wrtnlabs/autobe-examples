import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformCommunity } from "../../../api/structures/ICommunityPlatformCommunity";
import { IPageICommunityPlatformCommunity } from "../../../api/structures/IPageICommunityPlatformCommunity";
import { getCommunityPlatformCommunitiesCommunitySlug } from "../../../providers/getCommunityPlatformCommunitiesCommunitySlug";
import { patchCommunityPlatformCommunities } from "../../../providers/patchCommunityPlatformCommunities";

@Controller("/communityPlatform/communities")
export class CommunityplatformCommunitiesController {
  /**
   * Retrieve a filtered and paginated list of communities available for discovery on the platform.
   *
   * This operation supports the community discovery experience described in the business requirements, allowing both guests and members to browse communities before joining and to search for communities by name. Each returned item should provide the identifying information needed for discovery, centered on the community's human-readable title, summary description, and current subscriber count. This endpoint is intended for platform-wide browsing rather than member-specific membership management.
   *
   * The operation is backed primarily by the community_platform_communities table, which stores each community's canonical identity, owner membership reference, readable URL slug, title, description, and lifecycle status. The schema describes this table as the parent context for subscriptions, posts, moderator assignments, bans, reports, and historical snapshots. The community record itself does not store aggregate subscriber totals, so the subscriber count shown in list results must be derived from related community_platform_subscriptions records that represent effective membership links.
   *
   * From a security and access perspective, this endpoint is available to both guest and member actors because the requirements explicitly allow unauthenticated discovery and evaluation before subscription. The operation must return only communities that are currently available for discovery. Records that are not in an active business state or that have a deleted_at value indicating removal from active use should not be presented in normal browse results.
   *
   * Search behavior should prioritize the title field because the requirements explicitly call for community search by name. The underlying schema includes trigram indexes on both title and description, which supports efficient text discovery use cases, but the primary documented search experience for this endpoint is name-based discovery. Sorting and pagination should support scalable browsing across all available communities.
   *
   * This operation is commonly used before subscription-related workflows such as creating a membership link to a selected community. A client may call this endpoint first to discover candidate communities, then use a separate community detail or subscription creation endpoint after the user selects a specific community. Error handling should reject malformed search or pagination input while still treating an empty result set as a valid successful response when no communities match the search criteria.
   *
   * @param connection
   * @param body Community search, filter, pagination, and sorting criteria
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification Implement a platform-wide community listing query
     *   over community_platform_communities with derived subscriber counts from
     *   community_platform_subscriptions.
   *
   * Accept a request body of type ICommunityPlatformCommunity.IRequest containing pagination, optional search text, and optional sort criteria. Treat the primary search field as the community title because the requirements specify search by community name. If the request schema supports additional text filters, they may be applied to description as a secondary discovery aid, but title matching must remain the primary behavior.
   *
   * Select from community_platform_communities only records that are currently available for discovery. At minimum, exclude rows where deleted_at is not null. Also apply the business-active lifecycle filter using the status column so that archived or otherwise unavailable communities are not included in standard browse results.
   *
   * For each listed community, derive subscriber count by counting related community_platform_subscriptions rows where community_platform_community_id matches the community id, active is true, and deleted_at is null. Use an aggregated subquery, grouped join, or equivalent efficient counting strategy to avoid N+1 query behavior.
   *
   * Return paginated summary rows mapped to ICommunityPlatformCommunity.ISummary and wrapped in IPageICommunityPlatformCommunity.ISummary. Each summary should include the community identity and discovery fields needed by the requirements, especially slug, title, description, and the derived subscriber count. Preserve stable ordering for pagination by combining requested sort fields with a deterministic tiebreaker such as created_at or id.
   *
   * If the request includes unsupported sort fields or invalid pagination values, reject the operation with a validation error. If the search term yields no matches, return a successful empty page result rather than an error. This operation does not require a transaction unless the implementation combines additional side effects, because it is a read-only query.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @TypedBody()
    body: ICommunityPlatformCommunity.IRequest,
  ): Promise<IPageICommunityPlatformCommunity.ISummary> {
    try {
      return await patchCommunityPlatformCommunities({
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve detailed information for a single community identified by its platform-wide unique slug.
   *
   * This operation supports the community discovery and evaluation flow described in the requirements. Guests and members can browse communities, search communities by name, select one result, and then view that community for further evaluation before deciding whether to subscribe and participate. The underlying community record comes from `community_platform_communities`, which stores the community's canonical identity, descriptive presentation fields, owner member reference, and lifecycle state used for discovery and participation decisions.
   *
   * The returned resource should present the community's human-readable name and summary text using the `title` and `description` fields from `community_platform_communities`, together with its platform-wide unique `slug`, which the schema defines as the readable URL and lookup identifier. Because the community table explicitly notes that aggregate values such as subscriber counts are intentionally not stored there, the service must derive the subscriber count from related `community_platform_subscriptions` records. Only effective membership links should contribute to that count, meaning active subscriptions are used as the source of truth.
   *
   * This endpoint is intentionally available to both guests and members because the platform requirements state that community discovery must be possible before joining. A caller does not need to be subscribed in order to read the community and review whether it is relevant for later participation. At the same time, this endpoint is read-only and does not itself grant any participation privileges such as posting, commenting, or moderation actions.
   *
   * Validation for this operation centers on resolving the `communitySlug` path parameter to an existing community record. If no matching community exists, the request should be rejected as a missing resource rather than treated as an empty list outcome. If a matching community exists but has zero subscribers, the community remains available for discovery and its subscriber count must be returned as zero, consistent with the community discovery empty-state requirements.
   *
   * This operation is commonly used after a platform-wide community list retrieval or a community name search. For example, a client may first execute the community listing or search endpoint to find candidate communities, then call this detail endpoint with the selected community slug to obtain the fuller information needed for subscription decisions and community-specific navigation.
   *
   * @param connection
   * @param communitySlug Platform-wide unique community slug used for readable URL lookup
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification Implement this operation as a single-resource
     *   read against `community_platform_communities` using the unique `slug`
     *   column.
   *
   * 1. Validate that the `communitySlug` path parameter is a non-empty string and use it as the lookup key.
   * 2. Query `community_platform_communities` for exactly one row matching `slug = :communitySlug`.
   * 3. Enforce the business visibility rules for discovery-oriented reads. The operation is intended for communities that remain discoverable in browsing and search flows. If the service layer distinguishes unavailable lifecycle states, it should apply the same visibility policy used by platform-wide community discovery so that detail access is consistent with list and search behavior.
   * 4. In the same read flow, derive subscriber count from `community_platform_subscriptions` by counting records linked through `community_platform_community_id = community.id` where the subscription is currently effective for membership and counting purposes. Use `active = true` and exclude records that are no longer active from the total.
   * 5. Materialize the response as `ICommunityPlatformCommunity`, mapping canonical community fields from `community_platform_communities` and embedding the derived subscriber count as a computed property in the DTO layer.
   * 6. Do not mutate community, subscription, member, or profile data during this operation.
   *
   * Error handling:
   * - If no community exists for the provided slug, return a not-found error.
   * - If the slug resolves to a community that is not visible under the same rules as discovery endpoints, return the appropriate forbidden or not-found style error according to the platform's visibility policy.
   * - If the subscriber derivation finds no active subscriptions, return the community successfully with subscriber count set to `0`.
   *
   * Performance guidance:
   * - Use the unique index on `community_platform_communities.slug` for the primary lookup.
   * - Derive subscriber count with an indexed count query on `community_platform_subscriptions` filtered by `community_platform_community_id` and `active`.
   * - Prefer a compact projection for owner-related or profile-related data unless those fields are part of the DTO contract, because the core requirement is community evaluation data rather than full owner expansion.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":communitySlug")
  public async at(
    @TypedParam("communitySlug")
    communitySlug: string & tags.Format<"uuid">,
  ): Promise<ICommunityPlatformCommunity> {
    try {
      return await getCommunityPlatformCommunitiesCommunitySlug({
        communitySlug,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
