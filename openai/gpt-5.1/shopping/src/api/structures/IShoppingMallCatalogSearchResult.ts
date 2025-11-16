import { IShoppingMallProduct } from "./IShoppingMallProduct";
import { IShoppingMallBrand } from "./IShoppingMallBrand";
import { IShoppingMallCategory } from "./IShoppingMallCategory";

export namespace IShoppingMallCatalogSearchResult {
  /**
   * Summary representation of a catalog search result for the shopping mall.
   *
   * Represents a single item in search result lists returned from catalog
   * search operations. Each record provides enough information to render a
   * search card, including basic product details, pricing and primary
   * classification context. Heavy detail such as full description, full media
   * gallery, inventory breakdown, and audit information is intentionally
   * omitted for performance.
   *
   * This summary may be used as the `data` item type in paginated search
   * responses.
   */
  export type ISummary = {
    /**
     * Summary information about the matched product itself. Contains the
     * core fields required to render product name, primary image/thumbnail,
     * key merchandising badges, and base price range as defined by the
     * product summary schema.
     */
    product: IShoppingMallProduct.ISummary;

    /**
     * Summary information for the product brand, if any. Used to display
     * brand name or logo alongside the product in search results.
     */
    brand?: IShoppingMallBrand.ISummary | undefined;

    /**
     * Primary category under which this product is being surfaced in the
     * current search context. This may depend on the tree or merchandising
     * rules applied by the search engine.
     */
    primaryCategory?: IShoppingMallCategory.ISummary | undefined;

    /**
     * Optional snippet of text extracted from product fields (such as title
     * or description) that highlights matched search terms. Can be used to
     * emphasize why the item appears in the result set.
     */
    matchedTextSnippet?: string | undefined;

    /**
     * Numeric relevance score assigned by the search engine for this
     * product within the current query context. Higher scores indicate
     * better matches. The absolute scale is search-engine specific and
     * should generally be treated as relative, not absolute.
     */
    relevanceScore?: number | undefined;

    /**
     * Array of lightweight merchandising or UX badges that should be
     * displayed for this search result item (for example, `BEST_SELLER`,
     * `NEW`, `LIMITED_STOCK`). Each badge is represented as a simple string
     * code; client applications map these codes to localized labels and
     * icons.
     */
    badges?: string[] | undefined;
  };
}
